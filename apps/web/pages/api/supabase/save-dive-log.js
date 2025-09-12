// Supabase save dive log API endpoint - ADMIN ONLY
import { getAdminClient } from '@/lib/supabase'
import AssistantTrainingService from '@/lib/ai/assistantTrainingService'

export default async function handler(req, res) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  // Check method first - before any other processing
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 🔍 DEBUG: Log the incoming request data
  console.log('🔍 save-dive-log DEBUG:');
  console.log('  Method:', req.method);
  console.log('  Body:', JSON.stringify(req.body, null, 2));
  console.log('  Body keys:', Object.keys(req.body || {}));
  
  // Initialize Supabase client with error handling
  const supabase = getAdminClient();
  
  if (!supabase) {
    console.error('❌ Failed to initialize Supabase admin client');
    return res.status(500).json({ 
      error: 'Database connection failed',
      details: 'Could not initialize Supabase client'
    });
  }

  console.log('✅ Supabase admin client initialized successfully');

  // Generate UUID helper function
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // 🚀 NO MORE ENUM RESTRICTIONS - Let users express themselves naturally!
  // OpenAI can process any text input and extract structured data

  try {
    const { method } = req

    if (method === 'PUT') {
      // Handle update operation
      return await handleUpdateDiveLog(req, res, supabase);
    } else if (method === 'POST') {
      console.log('📝 Save dive log request:', req.body)
      
      // ✅ Handle both formats: direct dive log data or wrapped in diveLogData
      let diveLogData = req.body.diveLogData || req.body;
      
      // ✅ REAL USER AUTH: Get user from Supabase session
      let authenticatedUser = null;
      let userId = diveLogData.user_id || diveLogData.userId || req.body.user_id || req.headers['x-user-id'];

      // Try to get user from session token in Authorization header
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const { data: { user }, error } = await supabase.auth.getUser(token);
          if (user && !error) {
            authenticatedUser = user;
            userId = user.id;
            console.log(`🔐 Authenticated user for dive log: ${user.email} (${user.id})`);
          }
        } catch (error) {
          console.warn('⚠️ Failed to validate session token for dive log:', error);
        }
      }

      // 🚀 DEVELOPMENT FIX: Use a test user that exists in auth.users (only if no real user found)
      if (!userId || !userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        if (!authenticatedUser) {
          // Create a deterministic UUID based on a simple string for testing
          const crypto = require('crypto');
          const testString = 'koval-test-user-development';
          const hash = crypto.createHash('md5').update(testString).digest('hex');
          userId = [
            hash.substr(0, 8),
            hash.substr(8, 4),
            '4' + hash.substr(12, 3), // Version 4 UUID
            hash.substr(16, 4),
            hash.substr(20, 12)
          ].join('-');
          console.warn(`⚠️ Using development test user UUID: ${userId}`);
          
          // Try to create this user in auth.users if it doesn't exist
          try {
            const { error: checkError } = await supabase.auth.admin.getUserById(userId);
            if (checkError && checkError.message?.includes('User not found')) {
              const { error: createError } = await supabase.auth.admin.createUser({
                id: userId,
                email: 'test@kovaldeepai.dev',
                password: 'TempPassword123!',
                email_confirm: true,
                user_metadata: { full_name: 'Development Test User' }
              });
              if (!createError) {
                console.log('✅ Created development auth user');
              }
            }
          } catch (err) {
            console.warn('⚠️ Could not create auth user, continuing anyway:', err);
          }
        }
      }
      
      console.log(`💾 Saving dive log for user: ${userId}`)
      console.log('📝 Dive log data received:', diveLogData)

      if (!diveLogData) {
        return res.status(400).json({ error: 'Dive log data is required' })
      }

      // Helper function to convert values
      const toNum = (v) => v === '' || v == null ? null : Number(v)
      const toBool = (v) => Boolean(v)
      const toStr = (v) => v === '' || v == null ? null : String(v)
      
      // Helper function to convert time format to seconds
      const timeToSeconds = (timeStr) => {
        if (!timeStr || timeStr === '') return null
        
        // Handle "MM:SS" format like "2:30"
        if (typeof timeStr === 'string' && timeStr.includes(':')) {
          const [minutes, seconds] = timeStr.split(':').map(Number)
          return (minutes * 60) + (seconds || 0)
        }
        
        // If already a number, return as is
        if (typeof timeStr === 'number') return timeStr
        
        // Try to parse as number (seconds)
        const parsed = Number(timeStr)
        return isNaN(parsed) ? null : parsed
      }

      // Helper function to map frontend field names to database field names
      const mapFields = (data) => {
        return {
          // Map frontend camelCase to database snake_case - ALL FREE TEXT!
          date: data.date,
          discipline: toStr(data.discipline), // Free text: "CWT", "Constant Weight with bifins", "Modified CNF technique"
          location: toStr(data.location),
          target_depth: toNum(data.targetDepth || data.target_depth),
          reached_depth: toNum(data.reachedDepth || data.reached_depth),
          mouthfill_depth: toNum(data.mouthfillDepth || data.mouthfill_depth),
          issue_depth: toNum(data.issueDepth || data.issue_depth),
          total_dive_time: timeToSeconds(data.totalDiveTime || data.total_dive_time),
          squeeze: toBool(data.squeeze),
          issue_comment: toStr(data.issueComment || data.issue_comment),
          exit_protocol: toStr(data.exit || data.exitProtocol || data.exit_protocol), // Free text: "Clean exit", "Rushed but safe"
          attempt_type: toStr(data.attemptType || data.attempt_type),
          surface_protocol: toStr(data.surfaceProtocol || data.surface_protocol), // Free text: "Good recovery", "Slight samba"
          notes: toStr(data.notes),
          user_id: userId, // Always use the validated userId
        };
      };

      // ✅ COMPLETE FIELD MAPPING - MATCHES EXACT DIVE_LOGS SCHEMA
      const diveLogId = generateUUID(); // Generate UUID for linking
      const mappedFields = mapFields(diveLogData);
      
      const supabaseDiveLog = {
        id: diveLogId, // Use generated UUID for linking
        ...mappedFields,
        
        // Timestamps
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        
        // Store additional coaching metadata in JSONB field
        ai_analysis: {
          disciplineType: diveLogData.disciplineType,
          durationOrDistance: diveLogData.durationOrDistance,
          bottomTime: diveLogData.bottomTime,
          earSqueeze: toBool(diveLogData.earSqueeze),
          lungSqueeze: toBool(diveLogData.lungSqueeze),
          narcosisLevel: diveLogData.narcosisLevel,
          recoveryQuality: diveLogData.recoveryQuality,
          gear: diveLogData.gear || {},
          imagePreview: diveLogData.imagePreview,
          diveComputerFileName: diveLogData.diveComputerFileName,
          // 🚀 NEW: Store image analysis data and metrics
          imageAnalysis: diveLogData.imageAnalysis,
          extractedMetrics: diveLogData.extractedMetrics,
          imageUrl: diveLogData.imageUrl,
          imageId: diveLogData.imageId,
          coaching_notes: diveLogData.notes,
          original_data: diveLogData, // Store original for debugging
          entry_source: 'dive-journal-main-app',
          processed_at: new Date().toISOString()
        }
      };
      console.log('💾 Inserting dive log into Supabase:', JSON.stringify(supabaseDiveLog, null, 2))

      // Insert new record with enhanced error handling
      let savedLog;
      try {
        const { data, error } = await supabase
          .from('dive_logs')
          .insert([supabaseDiveLog])
          .select()
          .single()

        if (error) {
          console.error('❌ Supabase insert error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          return res.status(500).json({ 
            error: 'Failed to save dive log to database',
            details: error.message,
            code: error.code,
            hint: error.hint
          });
        }
        
        savedLog = data;
        console.log('✅ Dive log saved successfully to Supabase:', savedLog.id);
      } catch (insertError) {
        console.error('❌ Insert operation failed:', insertError);
        return res.status(500).json({ 
          error: 'Database insert operation failed',
          details: insertError.message
        });
      }

      console.log('✅ Dive log saved successfully to Supabase:', savedLog.id)

      // 🚀 CRITICAL: Link image record to dive log if image data exists
      if (diveLogData.imageId) {
        console.log(`🔗 Linking image ${diveLogData.imageId} to dive log ${savedLog.id}`)
        const { error: linkError } = await supabase
          .from('dive_log_image')
          .update({ dive_log_id: savedLog.id })
          .eq('id', diveLogData.imageId)

        if (linkError) {
          console.error('❌ Failed to link image to dive log:', linkError)
          // Don't fail the whole request, but log the error
        } else {
          console.log('✅ Image successfully linked to dive log')
        }
      }

      // 🚀 CRITICAL: Merge extracted metrics into dive log if available
      if (diveLogData.extractedMetrics && Object.keys(diveLogData.extractedMetrics).length > 0) {
        console.log('📊 Updating dive log with extracted metrics:', JSON.stringify(diveLogData.extractedMetrics, null, 2))
        
        // Prepare fields to update based on extracted metrics
        const metricsUpdate = {};
        
        // Handle max_depth from new comprehensive structure
        const depth = diveLogData.extractedMetrics.max_depth;
        if (depth && !savedLog.reached_depth) {
          metricsUpdate.reached_depth = Number(depth);
          console.log(`📏 Setting reached_depth from image: ${depth}m`);
        }
        
        // Handle dive time - check multiple possible field names
        const timeSeconds = diveLogData.extractedMetrics.dive_time_seconds;
        if (timeSeconds && !savedLog.total_dive_time) {
          const seconds = Number(timeSeconds);
          if (!isNaN(seconds)) {
            metricsUpdate.total_dive_time = seconds;
            console.log(`⏱️ Setting total_dive_time from image: ${seconds}s`);
          }
        }
        
        // Handle target_depth if not already set
        if (depth && !savedLog.target_depth) {
          metricsUpdate.target_depth = Number(depth);
          console.log(`🎯 Setting target_depth from reached depth: ${depth}m`);
        }
        
        // Add advanced metrics as JSON if available
        const advancedMetrics = {};
        if (diveLogData.extractedMetrics.descent_time) advancedMetrics.descent_time = diveLogData.extractedMetrics.descent_time;
        if (diveLogData.extractedMetrics.ascent_time) advancedMetrics.ascent_time = diveLogData.extractedMetrics.ascent_time;
        if (diveLogData.extractedMetrics.descent_rate) advancedMetrics.descent_rate = diveLogData.extractedMetrics.descent_rate;
        if (diveLogData.extractedMetrics.ascent_rate) advancedMetrics.ascent_rate = diveLogData.extractedMetrics.ascent_rate;
        if (diveLogData.extractedMetrics.hang_time) advancedMetrics.hang_time = diveLogData.extractedMetrics.hang_time;
        if (diveLogData.extractedMetrics.confidence) advancedMetrics.confidence = diveLogData.extractedMetrics.confidence;
        if (diveLogData.extractedMetrics.observations) advancedMetrics.observations = diveLogData.extractedMetrics.observations;
        
        if (Object.keys(advancedMetrics).length > 0) {
          // Store advanced metrics in the notes field or a JSON field
          const existingNotes = savedLog.notes || '';
          const metricsJson = JSON.stringify(advancedMetrics, null, 2);
          metricsUpdate.notes = existingNotes + (existingNotes ? '\n\n' : '') + `DIVE COMPUTER METRICS:\n${metricsJson}`;
          console.log(`📈 Adding advanced metrics to notes field`);
        }
        
        // Store image association in ai_analysis JSON field (since dedicated image fields may not exist)
        const currentAnalysis = savedLog.ai_analysis || {};
        if (diveLogData.imageUrl || diveLogData.imageId) {
          metricsUpdate.ai_analysis = {
            ...currentAnalysis,
            imageUrl: diveLogData.imageUrl,
            imageId: diveLogData.imageId,
            imageAssociation: {
              url: diveLogData.imageUrl,
              id: diveLogData.imageId,
              associatedAt: new Date().toISOString(),
              source: 'dive_computer_upload'
            }
          };
          console.log(`🖼️ Permanently associating image with dive log: ${diveLogData.imageId}`);
        }

        // Update ai_analysis with full extracted metrics
        const updatedMetadata = {
          ...savedLog.ai_analysis,
          extractedMetrics: diveLogData.extractedMetrics,
          imageAnalysis: diveLogData.imageAnalysis,
          autoExtractedData: {
            source: 'dive_computer_image',
            extractedAt: new Date().toISOString(),
            confidence: 'high' // Could be determined by AI analysis quality
          }
        };
        metricsUpdate.ai_analysis = updatedMetadata;
        
        if (Object.keys(metricsUpdate).length > 0) {
          const { error: updateError } = await supabase
            .from('dive_logs')
            .update(metricsUpdate)
            .eq('id', savedLog.id)
          
          if (updateError) {
            console.error('❌ Failed to update dive log with extracted metrics:', updateError)
          } else {
            console.log('✅ Dive log updated with extracted metrics')
            // Update the returned savedLog with new data
            Object.assign(savedLog, metricsUpdate);
          }
        }
      }

      // 🧠 AI ASSISTANT TRAINING - Train user's personal assistant
      try {
        console.log('🧠 Starting AI assistant training...');
        
        // Get user profile to check for existing assistant
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('openai_assistant_id, full_name, certification_level, years_experience, personal_best_depth')
          .eq('user_id', userId)
          .single();
        
        let assistantId = userProfile?.openai_assistant_id;
        
        // Create assistant if user doesn't have one
        if (!assistantId) {
          console.log('🆕 Creating new AI assistant for user...');
          const assistant = await AssistantTrainingService.createUserAssistant(userId, userProfile || {});
          assistantId = assistant.id;
          
          // Save assistant ID to user profile
          await supabase
            .from('user_profiles')
            .update({ openai_assistant_id: assistantId })
            .eq('user_id', userId);
          
          console.log(`✅ Assistant created and saved: ${assistantId}`);
        }
        
        // Train the assistant with this dive log
        if (assistantId) {
          await AssistantTrainingService.trainWithDiveLog(
            assistantId, 
            savedLog, 
            diveLogData.extractedMetrics || {}
          );
          console.log('✅ AI assistant trained with new dive log');
        }
        
      } catch (aiError) {
        console.error('⚠️ AI training failed (non-critical):', aiError);
        // Don't fail the whole request if AI training fails
      }

      return res.status(200).json({ 
        success: true, 
        diveLog: savedLog,
        message: 'Dive log saved successfully',
        imageLinked: !!diveLogData.imageId,
        metricsExtracted: !!diveLogData.extractedMetrics
      })
    }

  } catch (error) {
    // ✅ ENHANCED ERROR LOGGING for debugging
    console.error('❌ FATAL save-dive-log error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    console.error('❌ Request method:', req.method);
    console.error('❌ Request body keys:', Object.keys(req.body || {}));
    console.error('❌ Request headers:', Object.keys(req.headers || {}));
    
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Database operation failed',
      timestamp: new Date().toISOString(),
      requestId: Math.random().toString(36).substr(2, 9)
    });
  }
}

async function handleUpdateDiveLog(req, res, supabase) {
  try {
    const diveLogData = req.body.diveLogData || req.body;
    const { id, imageAnalysis, extractedMetrics, imageUrl, imageId } = diveLogData;
    
    if (!id) {
      return res.status(400).json({ error: 'Dive log ID is required for updates' });
    }

    // Get user ID from request
    const userId = diveLogData.user_id || req.body.user_id;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required for updates' });
    }
    
    console.log(`🔄 Updating dive log ${id} for user ${userId} with data:`, diveLogData);

    // Helper functions
    const toNum = (v) => v === '' || v == null ? null : Number(v);
    const toBool = (v) => Boolean(v);
    const toStr = (v) => v === '' || v == null ? null : String(v);

    // Prepare update data - ALL FREE TEXT!
    const updateData = {
      date: diveLogData.date,
      discipline: toStr(diveLogData.discipline), // Free text: any discipline description
      location: toStr(diveLogData.location),
      target_depth: toNum(diveLogData.targetDepth || diveLogData.target_depth),
      reached_depth: toNum(diveLogData.reachedDepth || diveLogData.reached_depth),
      mouthfill_depth: toNum(diveLogData.mouthfillDepth || diveLogData.mouthfill_depth),
      issue_depth: toNum(diveLogData.issueDepth || diveLogData.issue_depth),
      total_dive_time: toStr(diveLogData.totalDiveTime || diveLogData.total_dive_time),
      squeeze: toBool(diveLogData.squeeze),
      issue_comment: toStr(diveLogData.issueComment || diveLogData.issue_comment),
      exit_protocol: toStr(diveLogData.exit || diveLogData.exitProtocol || diveLogData.exit_protocol), // Free text
      attempt_type: toStr(diveLogData.attemptType || diveLogData.attempt_type),
      surface_protocol: toStr(diveLogData.surfaceProtocol || diveLogData.surface_protocol), // Free text
      notes: toStr(diveLogData.notes),
      updated_at: new Date().toISOString(),
      ai_analysis: {
        ...diveLogData.metadata,
        imageAnalysis,
        extractedMetrics,
        imageUrl,
        imageId,
        updatedAt: new Date().toISOString()
      }
    };

    // Update the dive log
    const { data: updatedLog, error: updateError } = await supabase
      .from('dive_logs')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId) // Ensure user can only update their own logs
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating dive log:', updateError);
      return res.status(500).json({ error: 'Failed to update dive log', details: updateError.message });
    }

    // If there's image data, also update the image record
    if (imageId && (imageAnalysis || extractedMetrics)) {
      await handleImageUpdate(imageId, imageAnalysis, extractedMetrics, supabase);
    }

    console.log('✅ Dive log updated successfully:', updatedLog);
    return res.status(200).json({ 
      success: true, 
      diveLog: updatedLog,
      message: 'Dive log updated successfully',
      imageLinked: !!imageId,
      metricsExtracted: !!extractedMetrics
    });

  } catch (error) {
    console.error('❌ Error in handleUpdateDiveLog:', error);
    return res.status(500).json({ error: 'Failed to update dive log' });
  }
}

async function handleImageUpdate(imageId, imageAnalysis, extractedMetrics, supabase) {
  try {
    const { error } = await supabase
      .from('dive_log_image')
      .update({
        ai_analysis: imageAnalysis,
        extracted_metrics: extractedMetrics,
        updated_at: new Date().toISOString()
      })
      .eq('id', imageId);

    if (error) {
      console.error('❌ Error updating image record:', error);
    } else {
      console.log('✅ Image record updated successfully');
    }
  } catch (error) {
    console.error('❌ Error in handleImageUpdate:', error);
  }
}
