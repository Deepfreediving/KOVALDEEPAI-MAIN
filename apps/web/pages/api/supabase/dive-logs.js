// Supabase dive logs API endpoint with enhanced security
import { getServerSupabaseClient } from '@/lib/supabaseServerClient'
import { SecurityValidator } from '@/lib/security'

const supabase = getServerSupabaseClient();

export default async function handler(req, res) {
  const startTime = Date.now();
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress || 'unknown';
  
  try {
    // Security: Validate request method
    const { method } = req
    
    // Security: Rate limiting check
    if (!SecurityValidator.checkRateLimit(clientIP, 60, 60000)) {
      SecurityValidator.logSecurityEvent({
        type: 'rate_limit_exceeded',
        details: `Rate limit exceeded for dive-logs API`,
        ip: clientIP,
        userAgent: req.headers['user-agent'],
        timestamp: new Date()
      });
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        retryAfter: 60 
      });
    }

    if (method === 'GET') {
      // Security: Validate and sanitize query parameters
      const { nickname, userId, email } = req.query;
      
      // Validate each parameter
      const nicknameValidation = SecurityValidator.validateInput(nickname, 'string');
      const userIdValidation = SecurityValidator.validateInput(userId, 'uuid');
      const emailValidation = SecurityValidator.validateInput(email, 'email');
      
      // Check for validation failures
      const validationErrors = [
        ...(!nicknameValidation.isValid ? nicknameValidation.errors.map(e => `nickname: ${e}`) : []),
        ...(!userIdValidation.isValid ? userIdValidation.errors.map(e => `userId: ${e}`) : []),
        ...(!emailValidation.isValid ? emailValidation.errors.map(e => `email: ${e}`) : [])
      ];
      
      if (validationErrors.length > 0) {
        SecurityValidator.logSecurityEvent({
          type: 'validation_failed',
          details: `Input validation failed: ${validationErrors.join(', ')}`,
          ip: clientIP,
          userAgent: req.headers['user-agent'],
          timestamp: new Date()
        });
        return res.status(400).json({ 
          error: 'Invalid input parameters',
          details: validationErrors 
        });
      }
      
      const user_identifier = userIdValidation.sanitizedData || nicknameValidation.sanitizedData || emailValidation.sanitizedData || 'anonymous'

      // ✅ ADMIN FALLBACK: If user_identifier matches admin patterns, use admin ID directly
      const ADMIN_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      const adminPatterns = ['daniel_koval', 'Daniel Koval', 'daniel@deepfreediving.com', 'danielkoval@example.com']
      const adminUUIDs = ['90d62ddb-d8ec-41b6-a8cd-77466e5bcfbc'] // Add the authenticated user's UUID
      
      let final_user_id;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user_identifier)
      
      // Check if email indicates admin user
      if (email && adminPatterns.includes(email)) {
        final_user_id = ADMIN_USER_ID
        console.log(`🔑 Admin email detected: "${email}" → using admin data UUID: ${ADMIN_USER_ID}`)
      } else if (isUUID && adminUUIDs.includes(user_identifier)) {
        // If it's an admin UUID, use the admin data UUID
        final_user_id = ADMIN_USER_ID
        console.log(`🔑 Admin UUID detected: "${user_identifier}" → using admin data UUID: ${ADMIN_USER_ID}`)
      } else if (isUUID) {
        final_user_id = user_identifier
      } else if (adminPatterns.includes(user_identifier)) {
        // Use admin ID for known admin patterns
        final_user_id = ADMIN_USER_ID
        console.log(`🔑 Admin pattern detected: "${user_identifier}" → using admin UUID: ${ADMIN_USER_ID}`)
      } else {
        // Create a deterministic UUID from the user identifier
        const crypto = require('crypto');
        const hash = crypto.createHash('md5').update(user_identifier).digest('hex');
        final_user_id = [
          hash.substr(0, 8),
          hash.substr(8, 4), 
          hash.substr(12, 4),
          hash.substr(16, 4),
          hash.substr(20, 12)
        ].join('-');
      }

      const { data: diveLogs, error } = await supabase
        .from('dive_logs')
        .select('*')
        .eq('user_id', final_user_id)
        .order('date', { ascending: false })

      if (error) {
        console.error('Supabase error:', error)
        return res.status(500).json({ error: error.message })
      }

      // 🚀 Fetch associated images separately to avoid foreign key issues
      const processedDiveLogs = [];
      
      for (const log of diveLogs || []) {
        try {
          // 🔧 Map database fields to frontend expected fields
          const mappedLog = {
            ...log,
            // Map snake_case to camelCase for frontend compatibility
            targetDepth: log.target_depth,
            reachedDepth: log.reached_depth,
            totalDiveTime: log.total_dive_time,
            mouthfillDepth: log.mouthfill_depth,
            issueDepth: log.issue_depth,
            issueComment: log.issue_comment,
            attemptType: log.attempt_type,
            surfaceProtocol: log.surface_protocol,
            // Keep original fields for backward compatibility
            target_depth: log.target_depth,
            reached_depth: log.reached_depth,
          };
          
          // Get images for this dive log
          const { data: images, error: imageError } = await supabase
            .from('dive_log_image')
            .select('*')
            .eq('dive_log_id', log.id)
            .limit(1);
          
          const imageRecord = images?.[0];
          
          if (imageRecord && !imageError) {
            // Generate public URL for image
            const { data: urlData } = supabase.storage
              .from(imageRecord.bucket)
              .getPublicUrl(imageRecord.path);
            
            processedDiveLogs.push({
              ...mappedLog,
              imageUrl: urlData.publicUrl,
              imageAnalysis: imageRecord.ai_analysis,
              extractedMetrics: imageRecord.extracted_metrics,
              imageId: imageRecord.id,
              originalFileName: imageRecord.original_filename,
              hasImage: true
            });
          } else {
            processedDiveLogs.push({
              ...mappedLog,
              hasImage: false
            });
          }
        } catch (imageErr) {
          console.warn(`⚠️ Could not fetch image for log ${log.id}:`, imageErr);
          processedDiveLogs.push({
            ...log,
            hasImage: false
          });
        }
      }

      console.log(`✅ Found ${processedDiveLogs.length} dive logs for user: ${user_identifier} (UUID: ${final_user_id})`)
      console.log(`📸 Images found: ${processedDiveLogs.filter(log => log.hasImage).length}`)
      
      // Security: Add response headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.setHeader('X-Request-ID', `dive-logs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
      
      return res.status(200).json({ 
        diveLogs: processedDiveLogs,
        stats: {
          totalLogs: processedDiveLogs.length,
          logsWithImages: processedDiveLogs.filter(log => log.hasImage).length,
          logsWithExtractedMetrics: processedDiveLogs.filter(log => log.extractedMetrics && Object.keys(log.extractedMetrics).length > 0).length
        },
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      })
    }

    // Security: Method not allowed
    SecurityValidator.logSecurityEvent({
      type: 'suspicious_activity',
      details: `Invalid method ${method} attempted on dive-logs API`,
      ip: clientIP,
      userAgent: req.headers['user-agent'],
      timestamp: new Date()
    });
    
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    // Security: Log error without exposing sensitive details
    SecurityValidator.logSecurityEvent({
      type: 'suspicious_activity',
      details: `API error: ${error.message}`,
      ip: clientIP,
      userAgent: req.headers['user-agent'],
      timestamp: new Date()
    });
    
    console.error('API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      requestId: `dive-logs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    })
  }
}
