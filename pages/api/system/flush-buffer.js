/**
 * 💾 BUFFER FLUSH ENDPOINT
 * Processes buffered data when connection is restored
 */

// CORS configuration for Wix domain
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.deepfreediving.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400', // 24 hours
  'Cross-Origin-Embedder-Policy': 'unsafe-none',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'Cross-Origin-Opener-Policy': 'unsafe-none',
};

export default async function handler(req, res) {
  // Add CORS headers to all responses
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, wixMemberId, sessionId, bufferData } = req.body;

    // Validate required fields
    if (!userId || !bufferData) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['userId', 'bufferData']
      });
    }

    console.log('💾 Buffer flush request:', {
      userId,
      wixMemberId: wixMemberId ? `***${wixMemberId.slice(-4)}` : null,
      sessionId: sessionId ? `***${sessionId.slice(-8)}` : null,
      bufferItems: bufferData.length,
    });

    const results = {
      processed: 0,
      failed: 0,
      errors: [],
      processedItems: [],
    };

    // Process each buffered item
    for (const bufferedItem of bufferData) {
      try {
        console.log('🔄 Processing buffered item:', bufferedItem.operation, bufferedItem.id);
        
        const result = await processBufferedOperation(bufferedItem, wixMemberId);
        
        results.processed++;
        results.processedItems.push({
          id: bufferedItem.id,
          operation: bufferedItem.operation,
          result,
          timestamp: bufferedItem.timestamp,
        });
        
      } catch (error) {
        console.error('❌ Failed to process buffered item:', bufferedItem.id, error);
        results.failed++;
        results.errors.push({
          id: bufferedItem.id,
          operation: bufferedItem.operation,
          error: error.message,
        });
      }
    }

    console.log('✅ Buffer flush completed:', {
      processed: results.processed,
      failed: results.failed,
      total: bufferData.length,
    });

    return res.status(200).json({
      success: true,
      message: 'Buffer flush completed',
      ...results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Buffer flush error:', error);
    
    return res.status(500).json({
      error: 'Buffer flush failed',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Process a single buffered operation
 */
async function processBufferedOperation(bufferedItem, wixMemberId) {
  const { operation, data, timestamp, userId } = bufferedItem;
  
  // Use the authenticated wixMemberId if available, otherwise use the original userId
  const effectiveUserId = wixMemberId || userId;
  
  switch (operation) {
    case 'saveDiveLog':
      return await processDiveLogOperation(data, effectiveUserId);
      
    case 'chatMessage':
      return await processChatOperation(data, effectiveUserId);
      
    case 'imageUpload':
      return await processImageOperation(data, effectiveUserId);
      
    case 'userMemory':
      return await processMemoryOperation(data, effectiveUserId);
      
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

/**
 * Process buffered dive log save
 */
async function processDiveLogOperation(diveLogData, userId) {
  const updatedData = {
    ...diveLogData,
    userId,
    processedFromBuffer: true,
    originalTimestamp: diveLogData.timestamp,
    processedAt: new Date().toISOString(),
  };

  // ✅ TEMPORARY: Skip buffered dive log saves to prevent duplicates  
  // The main app now handles all dive log saves directly
  console.log('⏭️ Skipping buffered dive log save to prevent duplicates');
  return { 
    success: true, 
    message: 'Buffered save skipped - handled by main app',
    logId: diveLogData.id || 'unknown'
  };
}

/**
 * Process buffered chat message
 */
async function processChatOperation(messageData, userId) {
  console.log('💬 Processing buffered chat message for:', userId);
  
  // For chat messages, we might want to replay them or just log them
  // This depends on your chat system architecture
  
  return {
    processed: true,
    messageId: messageData.id || `msg_${Date.now()}`,
    userId,
    content: messageData.content?.substring(0, 50) + '...',
  };
}

/**
 * Process buffered image upload
 */
async function processImageOperation(imageData, userId) {
  console.log('🖼️ Processing buffered image operation for:', userId);
  
  // For image uploads, you might want to retry the upload or OCR processing
  // This depends on what was buffered (metadata vs actual file)
  
  return {
    processed: true,
    imageId: imageData.id || `img_${Date.now()}`,
    userId,
    filename: imageData.filename,
  };
}

/**
 * Process buffered memory operation
 */
async function processMemoryOperation(memoryData, userId) {
  console.log('🧠 Processing buffered memory operation for:', userId);
  
  // Internal API call to save user memory
  const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/analyze/save-memory`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...memoryData,
      userId,
      processedFromBuffer: true,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Memory save failed: ${response.status} - ${errorData.message || 'Unknown error'}`);
  }

  return await response.json();
}