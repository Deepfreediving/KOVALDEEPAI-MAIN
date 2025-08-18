// Simple OpenAI-powered dive log analysis
import OpenAI from 'openai';
import handleCors from '@/utils/handleCors';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    if (handleCors(req, res)) return;

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { diveLogData, nickname } = req.body;

    console.log('🤖 Starting OpenAI dive analysis for:', nickname);

    if (!diveLogData) {
      return res.status(400).json({ error: 'Dive log data is required' });
    }

    // Format dive log for analysis
    const diveText = formatDiveLogForOpenAI(diveLogData);
    
    console.log('📝 Formatted dive data:', diveText);

    // Create OpenAI analysis prompt
    const prompt = `You are Daniel Koval, a world-renowned freediving instructor and coach. Analyze this dive log and provide detailed coaching feedback:

${diveText}

${diveLogData.extractedText ? `\nDive Computer Data: ${diveLogData.extractedText}` : ''}

Please provide:
1. Performance Assessment - How did the dive go overall?
2. Technical Analysis - What went well and what needs improvement?
3. Safety Evaluation - Any safety concerns or recommendations?
4. Training Recommendations - What should the diver focus on next?
5. Progression Advice - How can they improve for future dives?

Use your expertise in freediving physiology, technique, and safety. Be encouraging but also provide specific, actionable feedback.`;

    console.log('📤 Sending to OpenAI...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are Daniel Koval, a world-class freediving instructor and coach. Provide detailed, professional coaching feedback based on dive logs.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const analysis = completion.choices[0].message.content;

    console.log('✅ OpenAI analysis complete');

    return res.status(200).json({
      success: true,
      analysis: analysis,
      diveLogId: diveLogData.id,
      processedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ OpenAI analysis error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: 'Failed to analyze dive log with OpenAI'
    });
  }
}

function formatDiveLogForOpenAI(diveLog) {
  const parts = [];
  
  if (diveLog.date) parts.push(`Date: ${diveLog.date}`);
  if (diveLog.discipline) parts.push(`Discipline: ${diveLog.discipline}`);
  if (diveLog.location) parts.push(`Location: ${diveLog.location}`);
  if (diveLog.targetDepth || diveLog.target_depth) parts.push(`Target Depth: ${diveLog.targetDepth || diveLog.target_depth}m`);
  if (diveLog.reachedDepth || diveLog.reached_depth) parts.push(`Reached Depth: ${diveLog.reachedDepth || diveLog.reached_depth}m`);
  if (diveLog.totalDiveTime || diveLog.total_dive_time) parts.push(`Total Dive Time: ${diveLog.totalDiveTime || diveLog.total_dive_time}`);
  if (diveLog.mouthfillDepth || diveLog.mouthfill_depth) parts.push(`Mouthfill Depth: ${diveLog.mouthfillDepth || diveLog.mouthfill_depth}m`);
  if (diveLog.issueDepth || diveLog.issue_depth) parts.push(`Issue Depth: ${diveLog.issueDepth || diveLog.issue_depth}m`);
  if (diveLog.issueComment || diveLog.issue_comment) parts.push(`Issue: ${diveLog.issueComment || diveLog.issue_comment}`);
  if (diveLog.squeeze) parts.push(`Squeeze: Yes`);
  if (diveLog.exit) parts.push(`Exit: ${diveLog.exit}`);
  if (diveLog.attemptType || diveLog.attempt_type) parts.push(`Attempt Type: ${diveLog.attemptType || diveLog.attempt_type}`);
  if (diveLog.surfaceProtocol || diveLog.surface_protocol) parts.push(`Surface Protocol: ${diveLog.surfaceProtocol || diveLog.surface_protocol}`);
  if (diveLog.notes) parts.push(`Notes: ${diveLog.notes}`);

  return parts.join('\n');
}
