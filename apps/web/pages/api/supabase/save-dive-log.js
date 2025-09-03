// Supabase save dive log API endpoint - ADMIN ONLY
import { getAdminClient } from '@/lib/supabase'

export default async function handler(req, res) {
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

  try {
    const { method } = req

    if (method === 'PUT') {
      // Handle update operation
      return await handleUpdateDiveLog(req, res, supabase);
    } else if (method === 'POST') {
      console.log('📝 Save dive log request:', req.body)
      
      // ✅ Handle both formats: direct dive log data or wrapped in diveLogData
      let diveLogData = req.body.diveLogData || req.body;
      
      // ✅ ADMIN ONLY: Use fixed admin user ID
      const ADMIN_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' // Fixed admin UUID
      
      console.log(`💾 Saving dive log for admin user: ${ADMIN_USER_ID}`)
      console.log('📝 Dive log data received:', diveLogData)

      if (!diveLogData) {
        return res.status(400).json({ error: 'Dive log data is required' })
      }

      // Helper function to convert values
      const toNum = (v) => v === '' || v == null ? null : Number(v)
      const toBool = (v) => Boolean(v)
      const toStr = (v) => v === '' || v == null ? null : String(v)

      // ✅ COMPLETE FIELD MAPPING - MATCHES EXACT DIVE_LOGS SCHEMA
      const diveLogId = generateUUID(); // Generate UUID for linking
      const supabaseDiveLog = {
        id: diveLogId, // Use generated UUID for linking
        user_id: ADMIN_USER_ID,
        
        // Basic dive information
        date: diveLogData.date,
        discipline: diveLogData.discipline,
        location: toStr(diveLogData.location),
        
        // Depth measurements - CRITICAL FOR COACHING
        target_depth: toNum(diveLogData.targetDepth || diveLogData.target_depth),
        reached_depth: toNum(diveLogData.reachedDepth || diveLogData.reached_depth),
        mouthfill_depth: toNum(diveLogData.mouthfillDepth || diveLogData.mouthfill_depth), // ⚠️ ESSENTIAL
        issue_depth: toNum(diveLogData.issueDepth || diveLogData.issue_depth), // ⚠️ CRITICAL FOR SAFETY
        
        // Time measurements
        total_dive_time: toStr(diveLogData.totalDiveTime || diveLogData.total_dive_time),
        
        // Safety and issues - ESSENTIAL FOR COACHING
        squeeze: toBool(diveLogData.squeeze), // ⚠️ CRITICAL SAFETY INDICATOR
        issue_comment: toStr(diveLogData.issueComment || diveLogData.issue_comment), // ⚠️ DETAILED PROBLEM DESCRIPTION
        
        // Performance data
        exit: toStr(diveLogData.exit), // Clean/messy exit for performance analysis
        attempt_type: toStr(diveLogData.attemptType || diveLogData.attempt_type), // Training/competition/fun
        surface_protocol: toStr(diveLogData.surfaceProtocol || diveLogData.surface_protocol), // Recovery analysis
        
        // Training notes - ESSENTIAL FOR COACHING PROGRESSION
        notes: toStr(diveLogData.notes), // Detailed coaching observations
        
        // Timestamps
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        
        // Store additional coaching metadata in JSONB field
        metadata: {
          disciplineType: diveLogData.disciplineType,
          durationOrDistance: diveLogData.durationOrDistance,
          bottomTime: diveLogData.bottomTime, // Store here since no column exists
          earSqueeze: toBool(diveLogData.earSqueeze), // Store here since no column exists
          lungSqueeze: toBool(diveLogData.lungSqueeze), // Store here since no column exists
          narcosisLevel: diveLogData.narcosisLevel,
          recoveryQuality: diveLogData.recoveryQuality,
          gear: diveLogData.gear || {},
          imagePreview: diveLogData.imagePreview,
          diveComputerFileName: diveLogData.diveComputerFileName,
          // 🚀 NEW: Store image analysis data and metrics
          imageAnalysis: diveLogData.imageAnalysis,
          extractedMetrics: diveLogData.extractedMetrics,
          imageUrl: diveLogData.imageUrl,
          imageId: diveLogData.imageId
        }
      }
      console.log('💾 Inserting dive log into Supabase:', supabaseDiveLog)

      // Insert new record (simplified - always insert for now)
      const { data: savedLog, error } = await supabase
        .from('dive_logs')
        .insert([supabaseDiveLog])
        .select()
        .single()

      if (error) {
        console.error('❌ Supabase insert error:', error)
        return res.status(500).json({ 
          error: 'Failed to save dive log to database',
          details: error.message 
        })
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
        console.log('📊 Updating dive log with extracted metrics:', diveLogData.extractedMetrics)
        
        // Prepare fields to update based on extracted metrics
        const metricsUpdate = {};
        
        if (diveLogData.extractedMetrics.max_depth && !savedLog.reached_depth) {
          metricsUpdate.reached_depth = diveLogData.extractedMetrics.max_depth;
          console.log(`📏 Setting reached_depth from image: ${diveLogData.extractedMetrics.max_depth}m`);
        }
        
        if (diveLogData.extractedMetrics.dive_time_seconds && !savedLog.total_dive_time) {
          const minutes = Math.floor(diveLogData.extractedMetrics.dive_time_seconds / 60);
          const seconds = diveLogData.extractedMetrics.dive_time_seconds % 60;
          metricsUpdate.total_dive_time = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          console.log(`⏱️ Setting total_dive_time from image: ${metricsUpdate.total_dive_time}`);
        }
        
        // Update metadata with full extracted metrics
        const updatedMetadata = {
          ...savedLog.metadata,
          extractedMetrics: diveLogData.extractedMetrics,
          imageAnalysis: diveLogData.imageAnalysis,
          autoExtractedData: {
            source: 'dive_computer_image',
            extractedAt: new Date().toISOString(),
            confidence: 'high' // Could be determined by AI analysis quality
          }
        };
        metricsUpdate.metadata = updatedMetadata;
        
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

      return res.status(200).json({ 
        success: true, 
        diveLog: savedLog,
        message: 'Dive log saved successfully',
        imageLinked: !!diveLogData.imageId,
        metricsExtracted: !!diveLogData.extractedMetrics
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleUpdateDiveLog(req, res, supabase) {
  try {
    const diveLogData = req.body.diveLogData || req.body;
    const { id, imageAnalysis, extractedMetrics, imageUrl, imageId } = diveLogData;
    
    if (!id) {
      return res.status(400).json({ error: 'Dive log ID is required for updates' });
    }

    const ADMIN_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    console.log(`🔄 Updating dive log ${id} with data:`, diveLogData);

    // Helper functions
    const toNum = (v) => v === '' || v == null ? null : Number(v);
    const toBool = (v) => Boolean(v);
    const toStr = (v) => v === '' || v == null ? null : String(v);

    // Prepare update data
    const updateData = {
      date: diveLogData.date,
      discipline: diveLogData.discipline,
      location: toStr(diveLogData.location),
      target_depth: toNum(diveLogData.targetDepth || diveLogData.target_depth),
      reached_depth: toNum(diveLogData.reachedDepth || diveLogData.reached_depth),
      mouthfill_depth: toNum(diveLogData.mouthfillDepth || diveLogData.mouthfill_depth),
      issue_depth: toNum(diveLogData.issueDepth || diveLogData.issue_depth),
      total_dive_time: toStr(diveLogData.totalDiveTime || diveLogData.total_dive_time),
      squeeze: toBool(diveLogData.squeeze),
      issue_comment: toStr(diveLogData.issueComment || diveLogData.issue_comment),
      exit: toStr(diveLogData.exit),
      attempt_type: toStr(diveLogData.attemptType || diveLogData.attempt_type),
      surface_protocol: toStr(diveLogData.surfaceProtocol || diveLogData.surface_protocol),
      notes: toStr(diveLogData.notes),
      updated_at: new Date().toISOString(),
      metadata: {
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
      .eq('user_id', ADMIN_USER_ID) // Ensure user can only update their own logs
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
