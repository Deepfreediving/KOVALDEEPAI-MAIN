// Optimized Supabase dive logs API endpoint - Performance Enhanced with Rate Limiting
import { getAdminSupabaseClient } from '@/lib/supabaseServerClient'

// Simple in-memory rate limiting (for production, use Redis or a proper rate limiter)
const requestTracker = new Map();
const RATE_LIMIT = {
  requests: 50, // Max requests per window (increased from 10)
  windowMs: 60000, // 1 minute window
  maxConcurrent: 10 // Max concurrent requests per IP (increased from 3)
};

function isRateLimited(clientIP) {
  // Skip rate limiting for localhost and common testing IPs
  if (clientIP === '127.0.0.1' || 
      clientIP === 'localhost' || 
      clientIP === '::1' ||
      clientIP === 'unknown' ||
      !clientIP) {
    return { limited: false };
  }
  
  const now = Date.now();
  const clientKey = `${clientIP}`;
  
  if (!requestTracker.has(clientKey)) {
    requestTracker.set(clientKey, { requests: [], concurrent: 0 });
  }
  
  const clientData = requestTracker.get(clientKey);
  
  // Clean old requests outside the window
  clientData.requests = clientData.requests.filter(timestamp => 
    now - timestamp < RATE_LIMIT.windowMs
  );
  
  // Check rate limits - be more lenient
  if (clientData.requests.length >= RATE_LIMIT.requests) {
    return { limited: true, reason: `Too many requests (${clientData.requests.length}/${RATE_LIMIT.requests})` };
  }
  
  if (clientData.concurrent >= RATE_LIMIT.maxConcurrent) {
    return { limited: true, reason: `Too many concurrent requests (${clientData.concurrent}/${RATE_LIMIT.maxConcurrent})` };
  }
  
  // Add current request
  clientData.requests.push(now);
  clientData.concurrent++;
  
  return { limited: false };
}

function releaseRateLimit(clientIP) {
  const clientKey = `${clientIP}`;
  const clientData = requestTracker.get(clientKey);
  if (clientData && clientData.concurrent > 0) {
    clientData.concurrent--;
  }
}

export default async function handler(req, res) {
  const startTime = Date.now();
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress || 'unknown';
  
  // Apply rate limiting
  const rateLimitCheck = isRateLimited(clientIP);
  if (rateLimitCheck.limited) {
    console.warn(`🚫 Rate limit exceeded for ${clientIP}: ${rateLimitCheck.reason}`);
    return res.status(429).json({ 
      error: 'Too many requests',
      details: rateLimitCheck.reason,
      retryAfter: Math.ceil(RATE_LIMIT.windowMs / 1000)
    });
  }
  
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
      const { nickname, userId, email, limit = 50 } = req.query;
      
      // Sanitize limit parameter to prevent abuse
      const sanitizedLimit = Math.min(parseInt(limit) || 50, 100);
      
      // Admin user ID for the application
      const ADMIN_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      const adminPatterns = ['daniel_koval', 'Daniel Koval', 'daniel@deepfreediving.com', 'danielkoval@example.com']
      
      // Input validation function
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
          default: {
            return {
              isValid: input.length <= 100,
              sanitizedData: input.trim(),
              errors: input.length > 100 ? ['Input too long'] : []
            };
          }
        }
      };

      // Determine user ID
      let final_user_id = null
      let user_identifier = null

      if (userId) {
        const validation = validateInput(userId, 'uuid');
        if (validation.isValid) {
          final_user_id = validation.sanitizedData;
          user_identifier = `userId: ${userId}`;
        } else {
          return res.status(400).json({ 
            error: 'Invalid userId format',
            details: validation.errors 
          });
        }
      } else if (email) {
        const validation = validateInput(email, 'email');
        if (!validation.isValid) {
          return res.status(400).json({ 
            error: 'Invalid email format',
            details: validation.errors 
          });
        }
        user_identifier = validation.sanitizedData;
      } else if (nickname) {
        const validation = validateInput(nickname, 'string');
        if (!validation.isValid) {
          return res.status(400).json({ 
            error: 'Invalid nickname format',
            details: validation.errors 
          });
        }
        user_identifier = validation.sanitizedData;
      } else {
        return res.status(400).json({ 
          error: 'Missing required parameter: userId, nickname, or email' 
        });
      }

      // Map admin patterns to admin UUID
      if (!final_user_id) {
        if (adminPatterns.some(pattern => 
          user_identifier.toLowerCase().includes(pattern.toLowerCase())
        )) {
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
      }

      console.log(`🔍 Querying dive logs for user: ${user_identifier} (UUID: ${final_user_id})`);

      // ✅ PERFORMANCE OPTIMIZATION: Use the optimized function with timeout
      let query;
      const queryStartTime = Date.now();
      
      if (final_user_id === ADMIN_USER_ID) {
        // Use the optimized function with no user filter (gets all for admin)
        query = supabase
          .rpc('get_user_dive_logs_optimized')
          .limit(sanitizedLimit)
          .abortSignal(AbortSignal.timeout(10000)); // 10 second timeout
      } else {
        // Use the optimized function with user filter
        query = supabase
          .rpc('get_user_dive_logs_optimized', { target_user_id: final_user_id })
          .limit(sanitizedLimit)
          .abortSignal(AbortSignal.timeout(10000)); // 10 second timeout
      }

      const { data: diveLogs, error } = await query;
      const queryTime = Date.now() - queryStartTime;
      console.log(`⏱️ Database query completed in ${queryTime}ms`);

      if (error) {
        console.error('❌ Supabase query error:', error);
        if (error.message?.includes('timeout') || error.message?.includes('aborted')) {
          return res.status(504).json({ 
            error: 'Database query timeout - please try again with fewer results',
            details: 'Query took too long to execute'
          });
        }
        return res.status(500).json({ 
          error: error.message || 'Database query failed',
          details: 'Failed to fetch dive logs'
        });
      }

      // ✅ Process the results efficiently - batch process images
      console.log(`📊 Processing ${diveLogs?.length || 0} dive logs...`);
      
      // Pre-calculate all storage URLs in one batch to avoid individual calls
      const logsWithImages = (diveLogs || []).filter(log => log.has_image && log.image_path);
      console.log(`📸 Found ${logsWithImages.length} logs with images to process`);
      
      // Create a map of image paths to public URLs (batch operation)
      const imageUrlMap = new Map();
      try {
        logsWithImages.forEach(log => {
          if (log.image_path) {
            const { data: urlData } = supabase.storage
              .from(log.image_bucket || 'dive-images')
              .getPublicUrl(log.image_path);
            imageUrlMap.set(log.image_path, urlData.publicUrl);
          }
        });
        console.log(`🔗 Generated ${imageUrlMap.size} image URLs`);
      } catch (storageError) {
        console.error('Storage URL generation error:', storageError);
        // Continue without failing the entire request
      }

      const processedDiveLogs = (diveLogs || []).map(log => {
        // Map database fields to frontend expected fields
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

        // Handle image data efficiently using pre-calculated URLs
        if (log.has_image && log.image_path) {
          const imageUrl = imageUrlMap.get(log.image_path);
          return {
            ...mappedLog,
            imageUrl: imageUrl || null,
            imageAnalysis: log.image_analysis,
            extractedMetrics: log.extracted_metrics,
            imageId: log.image_id,
            originalFileName: log.original_filename,
            hasImage: true
          };
        } else {
          return {
            ...mappedLog,
            hasImage: false
          };
        }
      });

      console.log(`✅ Found ${processedDiveLogs.length} dive logs for user: ${user_identifier} (UUID: ${final_user_id})`)
      console.log(`📸 Images found: ${processedDiveLogs.filter(log => log.hasImage).length}`)
      
      // Add response headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Cache-Control', 'private, max-age=60, must-revalidate'); // 1 minute cache
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
          processingTime: Date.now() - startTime,
          optimized: true,
          viewUsed: final_user_id === ADMIN_USER_ID ? 'v_admin_dive_logs' : 'v_dive_logs_with_images'
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
  } finally {
    // Always release rate limit
    releaseRateLimit(clientIP);
  }
}
