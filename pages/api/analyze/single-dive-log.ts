// pages/api/analyze/single-dive-log.ts
// On-demand analysis of individual dive logs from Wix repeater

import { NextApiRequest, NextApiResponse } from 'next';
import handleCors from '@/utils/handleCors';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (handleCors(req, res)) return;

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { diveLogId, userId, diveLogData, diveLog: legacyDiveLog } = req.body;

    if (!diveLogId && !diveLogData && !legacyDiveLog) {
      return res.status(400).json({ error: 'diveLogId, diveLogData, or diveLog required' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    console.log(`🔍 Analyzing individual dive log for ${userId}`);

    let diveLog = diveLogData || legacyDiveLog;

    // ✅ If only ID provided, try to fetch from local storage first, then Wix
    if (diveLogId && !diveLog) {
      try {
        // ✅ FIX: Use BASE_URL from env or fallback
        const baseUrl = process.env.BASE_URL || 
          process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
          'https://kovaldeepai-main.vercel.app';
        
        console.log(`🗃️ Fetching dive log via: ${baseUrl}/api/analyze/get-dive-logs?userId=${userId}`);
        
        const localResponse = await fetch(`${baseUrl}/api/analyze/get-dive-logs?userId=${userId}`);
        if (localResponse.ok) {
          const localData = await localResponse.json();
          diveLog = localData.logs?.find((log: any) => log.id === diveLogId);
          console.log(`📁 Found dive log in local storage: ${!!diveLog}`);
        }

        // If not found locally, try Wix UserMemory
        if (!diveLog) {
          const response = await fetch(`https://www.deepfreediving.com/_functions/userMemory?itemId=${diveLogId}`, {
            headers: { 'Accept': 'application/json' }
          });

          if (response.ok) {
            const { data } = await response.json();
            diveLog = data[0];
            console.log(`🌐 Found dive log in Wix UserMemory: ${!!diveLog}`);
          }
        }
      } catch (error) {
        console.error('❌ Failed to fetch dive log:', error);
      }
    }

    if (!diveLog) {
      return res.status(404).json({ 
        error: 'Dive log not found', 
        details: 'Could not find dive log in local storage or Wix UserMemory',
        searchedId: diveLogId
      });
    }

    // ✅ Create comprehensive analysis prompt
    const analysisPrompt = `
🏊‍♂️ INDIVIDUAL DIVE LOG ANALYSIS REQUEST

Please analyze this specific dive log and provide detailed coaching feedback:

📊 DIVE DETAILS:
- Date: ${diveLog.date}
- Discipline: ${diveLog.discipline} (${diveLog.disciplineType})
- Location: ${diveLog.location}
- Target Depth: ${diveLog.targetDepth}m
- Reached Depth: ${diveLog.reachedDepth}m
- Depth Achievement: ${((diveLog.reachedDepth / diveLog.targetDepth) * 100).toFixed(1)}%
- Mouthfill Depth: ${diveLog.mouthfillDepth || 0}m
- Exit Quality: ${diveLog.exit}
- Surface Protocol: ${diveLog.surfaceProtocol || 'Not specified'}
- Total Time: ${diveLog.totalDiveTime || 'Not recorded'}
- Attempt Type: ${diveLog.attemptType}

⚠️ ISSUES & CHALLENGES:
- Issue Depth: ${diveLog.issueDepth ? `${diveLog.issueDepth}m` : 'None reported'}
- Issue Details: ${diveLog.issueComment || 'None'}
- Squeeze Reported: ${diveLog.squeeze ? 'Yes' : 'No'}

📝 NOTES: ${diveLog.notes || 'No additional notes'}

🎯 COACHING ANALYSIS NEEDED:
1. **Performance Assessment**: How did this dive go overall?
2. **Technical Analysis**: What went well and what needs improvement?
3. **Safety Evaluation**: Any safety concerns or positive safety practices?
4. **Next Steps**: Specific recommendations for the next training session
5. **Progression**: How does this fit into their overall development?

Please provide specific, actionable coaching feedback based on this dive data.
    `;

    // ✅ Call OpenAI for detailed analysis
    try {
      // ✅ FIX: Use BASE_URL from env or fallback
      const baseUrl = process.env.BASE_URL || 
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
        'https://kovaldeepai-main.vercel.app';

      console.log(`🤖 Sending dive log to OpenAI via: ${baseUrl}/api/openai/chat`);

      const chatResponse = await fetch(`${baseUrl}/api/openai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: analysisPrompt,
          userId,
          embedMode: true,
          profile: { nickname: 'Member', source: 'dive-log-analysis' },
          diveLogs: [diveLog]
        })
      });

      if (!chatResponse.ok) {
        throw new Error(`OpenAI API failed with status ${chatResponse.status}`);
      }

      const analysis = await chatResponse.json();
      const aiAnalysis = analysis.assistantMessage?.content;

      if (!aiAnalysis) {
        throw new Error('Empty analysis received from OpenAI');
      }

      console.log('✅ AI analysis completed successfully');

      // ✅ Update the dive log in Wix with analysis (if we have the ID)
      if (diveLogId) {
        try {
          await fetch('https://www.deepfreediving.com/_functions/userMemory', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemId: diveLogId,
              analysis: aiAnalysis,
              analysisStatus: 'completed',
              analyzedAt: new Date().toISOString(),
              analysisVersion: '2.0'
            })
          });
          console.log('✅ Updated dive log with analysis in Wix');
        } catch (updateError) {
          console.warn('⚠️ Failed to update dive log in Wix:', updateError);
          // Don't fail the whole request if update fails
        }
      }

      return res.status(200).json({
        success: true,
        analysis: aiAnalysis,
        diveLog: {
          id: diveLogId,
          date: diveLog.date,
          discipline: diveLog.discipline,
          location: diveLog.location,
          reachedDepth: diveLog.reachedDepth,
          targetDepth: diveLog.targetDepth
        },
        metadata: {
          analyzedAt: new Date().toISOString(),
          analysisVersion: '2.0'
        }
      });

    } catch (analysisError) {
      console.error('❌ AI analysis failed:', analysisError);
      return res.status(500).json({
        success: false,
        error: 'Failed to analyze dive log',
        details: analysisError instanceof Error ? analysisError.message : 'Unknown error'
      });
    }

  } catch (error) {
    console.error('❌ Single dive log analysis error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
