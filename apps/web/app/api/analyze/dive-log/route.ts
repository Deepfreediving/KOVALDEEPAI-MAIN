import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '../../_lib/requireUser';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireUser(request);
    const { logId } = await request.json();

    if (!logId) {
      return NextResponse.json({ error: 'Log ID is required' }, { status: 400 });
    }

    // Fetch the dive log
    const { data: log, error: fetchError } = await supabase
      .from('dive_logs')
      .select('*')
      .eq('id', logId)
      .eq('user_id', user.id) // Ensure user can only analyze their own logs
      .single();

    if (fetchError || !log) {
      return NextResponse.json({ error: 'Dive log not found' }, { status: 404 });
    }

    // Create analysis prompt
    const analysisPrompt = `
Analyze this dive log entry and provide insights:

Date: ${log.date}
Location: ${log.location || 'Not specified'}
Discipline: ${log.discipline || 'Not specified'}
Depth: ${log.depth ? `${log.depth}m` : 'Not specified'}
Duration: ${log.duration ? `${log.duration} seconds` : 'Not specified'}
Notes: ${log.notes || 'No notes provided'}

Please provide:
1. A brief summary of the dive
2. Analysis of depth and duration performance
3. Safety considerations based on the data
4. Suggestions for improvement
5. Any patterns or trends to note

Keep the analysis concise but informative.
`;

    // Generate AI analysis
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a professional freediving coach and safety expert. Provide helpful, safety-focused analysis of dive logs.',
        },
        {
          role: 'user',
          content: analysisPrompt,
        },
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    const analysisText = completion.choices[0]?.message?.content || 'Unable to generate analysis';

    // Generate a brief summary for storage
    const summaryCompletion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Summarize the following dive analysis in 1-2 sentences.',
        },
        {
          role: 'user',
          content: analysisText,
        },
      ],
      max_tokens: 100,
      temperature: 0.5,
    });

    const summary = summaryCompletion.choices[0]?.message?.content || 'Analysis completed';

    // Update the dive log with the analysis
    const { error: updateError } = await supabase
      .from('dive_logs')
      .update({
        analysis: {
          text: analysisText,
          summary,
          generated_at: new Date().toISOString(),
        },
      })
      .eq('id', logId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to save analysis:', updateError);
      // Still return the analysis even if we couldn't save it
    }

    return NextResponse.json({
      success: true,
      analysis: analysisText,
      summary,
      logId,
    });
  } catch (error) {
    console.error('Dive log analysis error:', error);
    
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Failed to analyze dive log' },
      { status: 500 }
    );
  }
}
