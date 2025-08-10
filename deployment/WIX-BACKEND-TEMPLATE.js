// WIX BACKEND TEMPLATE - Copy this to your Wix backend/userMemory.js file

import { userMemory } from 'wix-users-backend';
import { ok, badRequest, serverError } from 'wix-http-functions';

// Dataset configuration
const DATASET_PREFIX = '@deepfreediving/kovaldeepai-app/';
const DEFAULT_DATASET = 'Import1';

/**
 * Save dive log data to UserMemory dataset
 */
export async function post_saveToUserMemory(request) {
  try {
    const { userId, data, dataset = DEFAULT_DATASET } = await request.body.json();
    
    if (!userId) {
      return badRequest({ error: 'userId required' });
    }
    
    if (!data) {
      return badRequest({ error: 'data required' });
    }
    
    // Save to specific dataset
    const result = await userMemory.set(userId, data, {
      dataset: `${DATASET_PREFIX}${dataset}`
    });
    
    console.log(`✅ UserMemory save successful for ${userId} in dataset ${dataset}`);
    
    return ok({
      success: true,
      wixId: result.wixId || 'saved',
      dataset: `${DATASET_PREFIX}${dataset}`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ UserMemory save error:', error);
    return serverError({
      success: false,
      error: error.message || 'Failed to save to UserMemory'
    });
  }
}

/**
 * Get dive log data from UserMemory dataset
 */
export async function post_getFromUserMemory(request) {
  try {
    const { userId, dataset = DEFAULT_DATASET } = await request.body.json();
    
    if (!userId) {
      return badRequest({ error: 'userId required' });
    }
    
    // Get from specific dataset
    const result = await userMemory.get(userId, {
      dataset: `${DATASET_PREFIX}${dataset}`
    });
    
    console.log(`✅ UserMemory query successful for ${userId} in dataset ${dataset}`);
    
    return ok({
      success: true,
      data: result || {},
      dataset: `${DATASET_PREFIX}${dataset}`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ UserMemory query error:', error);
    return serverError({
      success: false,
      error: error.message || 'Failed to query UserMemory',
      data: {}
    });
  }
}

/**
 * Query multiple entries from UserMemory dataset
 */
export async function post_queryUserMemoryDataset(request) {
  try {
    const { userId, dataset = DEFAULT_DATASET, limit = 50 } = await request.body.json();
    
    if (!userId) {
      return badRequest({ error: 'userId required' });
    }
    
    // For dive logs, we'll query the specific user's data
    const userData = await userMemory.get(userId, {
      dataset: `${DATASET_PREFIX}${dataset}`
    });
    
    // Extract dive logs from user data
    const diveLogs = userData?.diveLogs || [];
    
    // Sort by date (newest first) and limit results
    const sortedLogs = diveLogs
      .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date))
      .slice(0, limit);
    
    console.log(`✅ UserMemory dataset query successful: ${sortedLogs.length} entries for ${userId}`);
    
    return ok({
      success: true,
      entries: sortedLogs,
      total: diveLogs.length,
      dataset: `${DATASET_PREFIX}${dataset}`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ UserMemory dataset query error:', error);
    return serverError({
      success: false,
      error: error.message || 'Failed to query UserMemory dataset',
      entries: []
    });
  }
}

/**
 * Update specific dive log in UserMemory
 */
export async function post_updateDiveLogInUserMemory(request) {
  try {
    const { userId, diveLogId, updates, dataset = DEFAULT_DATASET } = await request.body.json();
    
    if (!userId || !diveLogId) {
      return badRequest({ error: 'userId and diveLogId required' });
    }
    
    // Get current user data
    const userData = await userMemory.get(userId, {
      dataset: `${DATASET_PREFIX}${dataset}`
    });
    
    const diveLogs = userData?.diveLogs || [];
    
    // Find and update the specific dive log
    const logIndex = diveLogs.findIndex(log => log.id === diveLogId);
    
    if (logIndex === -1) {
      return badRequest({ error: 'Dive log not found' });
    }
    
    // Update the dive log
    diveLogs[logIndex] = { ...diveLogs[logIndex], ...updates, updatedAt: new Date().toISOString() };
    
    // Save back to UserMemory
    const result = await userMemory.set(userId, { ...userData, diveLogs }, {
      dataset: `${DATASET_PREFIX}${dataset}`
    });
    
    console.log(`✅ Dive log updated in UserMemory for ${userId}`);
    
    return ok({
      success: true,
      updatedLog: diveLogs[logIndex],
      wixId: result.wixId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ UserMemory update error:', error);
    return serverError({
      success: false,
      error: error.message || 'Failed to update dive log'
    });
  }
}

// INSTALLATION INSTRUCTIONS:
//
// 1. Go to your Wix Editor
// 2. Click on "Code Files" in the sidebar
// 3. Open "Backend" section
// 4. Create new file: "userMemory.js" 
// 5. Copy this entire code into that file
// 6. Save and publish your site
// 7. The integration should work immediately
//
// This provides all the backend functions needed for:
// - Saving dive logs to UserMemory
// - Querying dive logs for display
// - Updating logs with AI analysis
// - Pattern analysis data storage
