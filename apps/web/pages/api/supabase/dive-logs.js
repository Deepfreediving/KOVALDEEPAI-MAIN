// Supabase dive logs API endpoint
import { getAdminSupabaseClient } from '@/lib/supabaseServerClient'

export default async function handler(req, res) {
  const startTime = Date.now();
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress || 'unknown';
  
  try {
    // Initialize Supabase client with error handling
    const supabase = getAdminSupabaseClient();
    
    if (!supabase) {
      console.error('❌ Failed to initialize Supabase admin client');
      return res.status(500).json({ 
        error: 'Database connection failed',
        details: 'Could not initialize Supabase client'
      });
    }

    console.log('✅ Supabase admin client initialized successfully');
  
    // Validate request method
    const { method } = req
    
    if (method === 'GET') {
      // Get and validate query parameters
      const { nickname, userId, email } = req.query;
      
      // Basic input validation
      const validateInput = (input, type) => {
        if (!input) return { isValid: true, sanitizedData: null };
        
        switch (type) {
          case 'uuid': {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            return {
              isValid: uuidRegex.test(input),
              sanitizedData: input.trim(),
              errors: !uuidRegex.test(input) ? ['Invalid UUID format'] : []
            };
          }
          case 'email': {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return {
              isValid: emailRegex.test(input),
              sanitizedData: input.trim().toLowerCase(),
              errors: !emailRegex.test(input) ? ['Invalid email format'] : []
            };
          }
          case 'string':
            return {
              isValid: typeof input === 'string' && input.length <= 100,
              sanitizedData: input.trim(),
              errors: typeof input !== 'string' || input.length > 100 ? ['Invalid string'] : []
            };
          default:
            return { isValid: true, sanitizedData: input };
        }
      };
      
      const nicknameValidation = validateInput(nickname, 'string');
      const userIdValidation = validateInput(userId, 'uuid');
      const emailValidation = validateInput(email, 'email');
      
      // Check for validation failures
      const validationErrors = [
        ...(!nicknameValidation.isValid ? nicknameValidation.errors.map(e => `nickname: ${e}`) : []),
        ...(!userIdValidation.isValid ? userIdValidation.errors.map(e => `userId: ${e}`) : []),
        ...(!emailValidation.isValid ? emailValidation.errors.map(e => `email: ${e}`) : [])
      ];
      
      if (validationErrors.length > 0) {
        console.warn(`Input validation failed: ${validationErrors.join(', ')}`);
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

      // ✅ EMERGENCY PERFORMANCE FIX: Use simple optimized query instead of views
      console.log(`🔍 Querying dive logs for user: ${user_identifier} (UUID: ${final_user_id})`);

      // Try dive_logs table first (admin table)
      let { data: diveLogs, error } = await supabase
        .from('dive_logs')
        .select('*')
        .eq('user_id', final_user_id)
        .order('date', { ascending: false })
        .limit(50);

      // If no results in dive_logs table, try dive_log table (original table)
      if (!error && (!diveLogs || diveLogs.length === 0)) {
        console.log('🔄 No data in dive_logs table, trying dive_log table...');
        const { data: fallbackLogs, error: fallbackError } = await supabase
          .from('dive_log')
          .select('*')
          .eq('user_id', final_user_id)
          .order('date', { ascending: false })
          .limit(50);

        if (!fallbackError && fallbackLogs && fallbackLogs.length > 0) {
          diveLogs = fallbackLogs;
          console.log(`✅ Found ${fallbackLogs.length} logs in dive_log table`);
        }
      }

      // Process the logs (optimized views include image data, fallback needs separate queries)
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
          
          // Check if this is from an optimized view (has image data already)
          if ('image_id' in log) {
            // Data from optimized view - image data is already included
            if (log.image_id) {
              const { data: urlData } = supabase.storage
                .from(log.image_bucket)
                .getPublicUrl(log.image_path);
              
              processedDiveLogs.push({
                ...mappedLog,
                imageUrl: urlData.publicUrl,
                imageAnalysis: log.image_analysis,
                extractedMetrics: log.extracted_metrics,
                imageId: log.image_id,
                originalFileName: log.original_filename,
                hasImage: true
              });
            } else {
              processedDiveLogs.push({
                ...mappedLog,
                hasImage: false
              });
            }
          } else {
            // Fallback - fetch images separately (N+1 query - not ideal but works)
            const { data: images, error: imageError } = await supabase
              .from('dive_log_image')
              .select('*')
              .eq('dive_log_id', log.id)
              .limit(1);
            
            const imageRecord = images?.[0];
            
            if (imageRecord && !imageError) {
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
      
      // Add response headers
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

    // Method not allowed
    console.warn(`Invalid method ${method} attempted on dive-logs API from ${clientIP}`);
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      requestId: `dive-logs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });
  }
}
