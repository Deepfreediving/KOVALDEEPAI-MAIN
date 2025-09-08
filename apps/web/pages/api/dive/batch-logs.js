// Enhanced batch retrieval API for dive logs with filtering, pagination, and analysis support
import { getAdminClient } from '@/lib/supabase';
import { handleVercelAuth } from '@/lib/vercelAuth';

export default async function handler(req, res) {
  // Handle Vercel authentication protection for API routes
  handleVercelAuth(req, res);
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      userId,
      limit = 50,
      offset = 0,
      sortBy = 'date',
      sortOrder = 'desc',
      discipline,
      location,
      dateFrom,
      dateTo,
      hasIssues,
      includeAnalysis = false,
      format = 'json'
    } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    console.log(`🔍 Batch retrieving dive logs for user: ${userId}`);
    console.log(`📊 Filters - limit: ${limit}, offset: ${offset}, sortBy: ${sortBy}, sortOrder: ${sortOrder}`);

    const supabase = getAdminClient();
    
    if (!supabase) {
      console.error('❌ Failed to initialize Supabase admin client');
      return res.status(500).json({ 
        error: 'Database connection failed',
        details: 'Could not initialize Supabase client'
      });
    }

    // Build base query
    let query = supabase
      .from('dive_logs')
      .select('*')
      .eq('user_id', userId);

    // Apply filters
    if (discipline) {
      query = query.eq('discipline', discipline);
    }

    if (location) {
      query = query.ilike('location', `%${location}%`);
    }

    if (dateFrom) {
      query = query.gte('date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('date', dateTo);
    }

    if (hasIssues === 'true') {
      query = query.or('squeeze.eq.true,ear_squeeze.eq.true,lung_squeeze.eq.true,issue_comment.neq.null');
    } else if (hasIssues === 'false') {
      query = query.and('squeeze.eq.false,ear_squeeze.eq.false,lung_squeeze.eq.false,issue_comment.is.null');
    }

    // Apply sorting
    const validSortColumns = [
      'date', 'created_at', 'target_depth', 'reached_depth', 
      'total_dive_time', 'discipline', 'location'
    ];
    
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'date';
    const sortDirection = sortOrder === 'asc' ? { ascending: true } : { ascending: false };
    
    query = query.order(sortColumn, sortDirection);

    // Apply pagination
    const limitNum = Math.min(parseInt(limit), 100); // Cap at 100
    const offsetNum = parseInt(offset);
    
    query = query.range(offsetNum, offsetNum + limitNum - 1);

    // Execute query
    const { data: diveLogs, error, count } = await query;

    if (error) {
      console.error('❌ Error fetching dive logs:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch dive logs',
        details: error.message 
      });
    }

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabase
      .from('dive_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.warn('⚠️ Could not get total count:', countError);
    }

    // Optionally include recent analyses
    let recentAnalyses = [];
    if (includeAnalysis === 'true') {
      const { data: analyses, error: analysisError } = await supabase
        .from('dive_log_analyses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (analysisError) {
        console.warn('⚠️ Could not fetch analyses:', analysisError);
      } else {
        recentAnalyses = analyses || [];
      }
    }

    // Calculate statistics
    const stats = {
      totalLogs: totalCount || 0,
      averageDepth: diveLogs?.length ? 
        Math.round(diveLogs.reduce((sum, log) => sum + (log.reached_depth_m || 0), 0) / diveLogs.length * 10) / 10 : 0,
      deepestDive: diveLogs?.length ? 
        Math.max(...diveLogs.map(log => log.reached_depth_m || 0)) : 0,
      disciplineBreakdown: diveLogs?.reduce((acc, log) => {
        acc[log.discipline] = (acc[log.discipline] || 0) + 1;
        return acc;
      }, {}) || {},
      issueCount: diveLogs?.filter(log => 
        log.squeeze || log.ear_squeeze || log.lung_squeeze || log.issue_comment
      ).length || 0
    };

    console.log(`✅ Retrieved ${diveLogs?.length || 0} dive logs (${offsetNum + 1}-${offsetNum + (diveLogs?.length || 0)} of ${totalCount || 0})`);

    // Handle different response formats
    if (format === 'csv') {
      // Generate CSV format for export
      const csvHeaders = [
        'Date', 'Discipline', 'Location', 'Target Depth (m)', 'Reached Depth (m)',
        'Mouthfill Depth (m)', 'Total Time (s)', 'Exit Protocol', 'Surface Protocol',
        'Squeeze', 'Ear Squeeze', 'Lung Squeeze', 'Notes'
      ];
      
      const csvRows = diveLogs?.map(log => [
        log.date,
        log.discipline,
        log.location,
        log.target_depth,
        log.reached_depth,
        log.mouthfill_depth,
        log.total_dive_time,
        log.exit_protocol,
        log.surface_protocol,
        log.squeeze,
        log.ai_analysis?.earSqueeze || false,
        log.ai_analysis?.lungSqueeze || false,
        log.notes?.replace(/"/g, '""') // Escape quotes for CSV
      ]) || [];

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="dive-logs-${userId}-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.status(200).send(csvContent);
    }

    return res.status(200).json({
      success: true,
      diveLogs: diveLogs || [],
      pagination: {
        total: totalCount || 0,
        offset: offsetNum,
        limit: limitNum,
        hasMore: (offsetNum + limitNum) < (totalCount || 0)
      },
      filters: {
        discipline,
        location,
        dateFrom,
        dateTo,
        hasIssues,
        sortBy: sortColumn,
        sortOrder
      },
      stats,
      recentAnalyses: includeAnalysis === 'true' ? recentAnalyses : undefined,
      message: `Retrieved ${diveLogs?.length || 0} dive logs`
    });

  } catch (error) {
    console.error('❌ Batch retrieval API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
