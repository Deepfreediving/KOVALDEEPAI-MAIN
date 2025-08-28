// Handle dive log audit requests from chat
import handleCors from '@/utils/handleCors';

export default async function handler(req, res) {
  try {
    if (handleCors(req, res)) return;
    
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, message } = req.body;
    
    if (!userId || !message) {
      return res.status(400).json({ error: 'userId and message are required' });
    }

    // Check if user is requesting an audit
    const lowerMessage = message.toLowerCase().trim();
    const isAuditRequest = lowerMessage === 'yes' || 
                          lowerMessage.includes('yes') && (
                            lowerMessage.includes('audit') || 
                            lowerMessage.includes('evaluation') ||
                            lowerMessage.includes('analyze')
                          );

    if (!isAuditRequest) {
      return res.status(200).json({
        success: false,
        message: 'Not an audit request'
      });
    }

    // Get the user's most recent dive log
    const baseUrl = `http://localhost:3000`;
    
    console.log(`🔍 Looking for recent dive logs for audit request...`);
    
    const diveLogsResponse = await fetch(`${baseUrl}/api/supabase/dive-logs?userId=${encodeURIComponent(userId)}`);
    
    if (!diveLogsResponse.ok) {
      throw new Error('Could not fetch dive logs');
    }
    
    const diveLogsData = await diveLogsResponse.json();
    const diveLogs = diveLogsData.diveLogs || [];
    
    if (diveLogs.length === 0) {
      return res.status(200).json({
        success: false,
        message: 'No dive logs found to audit'
      });
    }

    // Get the most recent dive log
    const mostRecentDive = diveLogs[0];
    
    console.log(`🔍 Running audit for most recent dive: ${mostRecentDive.id}`);
    
    // Call the audit API
    const auditResponse = await fetch(`${baseUrl}/api/audit/dive-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        logId: mostRecentDive.id,
        userId: userId
      }),
    });

    if (!auditResponse.ok) {
      const errorData = await auditResponse.json();
      throw new Error(errorData.error || 'Audit failed');
    }

    const { audit } = await auditResponse.json();
    
    // Format E.N.C.L.O.S.E. audit results for chat display
    let auditMessage = `🔍 **E.N.C.L.O.S.E. DIVE JOURNAL EVALUATION COMPLETE**

${audit.summary}

**� Performance Scores:**
• Safety: ${audit.scores?.safety || 'N/A'}/5
• Technique: ${audit.scores?.technique || 'N/A'}/5  
• Efficiency: ${audit.scores?.efficiency || 'N/A'}/5
• Overall: ${audit.scores?.final || 'N/A'}/5

**🔍 E.N.C.L.O.S.E. Analysis:**`;

    // Add each category with issues
    if (audit.enclose) {
      audit.enclose.forEach(category => {
        if (category.severity > 0) {
          const severityIcon = category.severity === 3 ? '🚨' : category.severity === 2 ? '⚠️' : '⚡';
          auditMessage += `\n${severityIcon} **${category.title}**: ${category.reasons.join(', ')}`;
        }
      });
    }

    // Add action items
    if (audit.action_items && audit.action_items.length > 0) {
      auditMessage += `\n\n**🎯 Recommended Actions:**\n• ${audit.action_items.join('\n• ')}`;
    }

    // Add technical metrics if available
    if (audit.derived_metrics) {
      const metrics = audit.derived_metrics;
      auditMessage += `\n\n**⚡ Technical Metrics:**`;
      if (metrics.descent_mps) auditMessage += `\n• Descent Speed: ${metrics.descent_mps.toFixed(2)} m/s`;
      if (metrics.ascent_mps) auditMessage += `\n• Ascent Speed: ${metrics.ascent_mps.toFixed(2)} m/s`;
      if (metrics.vdi_sec_per_meter) auditMessage += `\n• VDI: ${metrics.vdi_sec_per_meter.toFixed(1)} sec/m`;
    }

    auditMessage += `\n\n*This E.N.C.L.O.S.E. evaluation systematically analyzed your dive for Equalization, Narcosis, CO₂ management, Leg efficiency, Oxygen management, Squeeze risk, and Equipment issues to provide targeted coaching recommendations.*`;

    return res.status(200).json({
      success: true,
      auditMessage,
      audit
    });

  } catch (error) {
    console.error('❌ Audit request handler error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: 'Failed to process audit request'
    });
  }
}
