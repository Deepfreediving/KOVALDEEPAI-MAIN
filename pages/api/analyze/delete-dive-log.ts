import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

interface DeleteDiveLogRequest {
  userId: string;
  logId: string;
  source?: string;
}

interface DeleteDiveLogResponse {
  success: boolean;
  message: string;
  deletedId?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DeleteDiveLogResponse>
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      error: 'Only DELETE requests are supported'
    });
  }

  try {
    const { userId, logId, source = 'unknown' }: DeleteDiveLogRequest = req.body;

    console.log(`🗑️ DELETE DIVE LOG API: Starting delete process`, {
      userId,
      logId,
      source,
      timestamp: new Date().toISOString()
    });

    // Validate required fields
    if (!userId || !logId) {
      console.error('❌ DELETE DIVE LOG API: Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId and logId are required',
        error: 'MISSING_FIELDS'
      });
    }

    // Step 1: Delete from local file system
    const userDir = path.join(process.cwd(), 'uploads', 'user-data', userId);
    const diveLogsFile = path.join(userDir, 'dive-logs.json');

    let deleted = false;
    
    try {
      if (fs.existsSync(diveLogsFile)) {
        const existingData = JSON.parse(fs.readFileSync(diveLogsFile, 'utf8'));
        const originalLength = existingData.length;
        
        // Filter out the log to delete
        const updatedLogs = existingData.filter((log: any) => log.id !== logId);
        
        if (updatedLogs.length < originalLength) {
          // Write updated logs back to file
          fs.writeFileSync(diveLogsFile, JSON.stringify(updatedLogs, null, 2));
          deleted = true;
          console.log(`✅ DELETE DIVE LOG API: Deleted from local file system`);
        } else {
          console.log(`⚠️ DELETE DIVE LOG API: Log with ID ${logId} not found in local file`);
        }
      } else {
        console.log(`⚠️ DELETE DIVE LOG API: No dive logs file found for user ${userId}`);
      }
    } catch (fileError) {
      console.error('❌ DELETE DIVE LOG API: Error deleting from local file:', fileError);
    }

    // Step 2: Try to delete from Wix (optional - may fail if Wix is not configured)
    try {
      // TODO: Add Wix deletion logic here when Wix integration is available
      console.log('📝 DELETE DIVE LOG API: Wix deletion skipped (not implemented yet)');
    } catch (wixError) {
      console.warn('⚠️ DELETE DIVE LOG API: Wix deletion failed:', wixError);
      // Don't fail the whole operation if Wix fails
    }

    if (deleted) {
      console.log(`✅ DELETE DIVE LOG API: Successfully deleted dive log ${logId}`);
      return res.status(200).json({
        success: true,
        message: 'Dive log deleted successfully',
        deletedId: logId
      });
    } else {
      console.log(`❌ DELETE DIVE LOG API: Failed to delete dive log ${logId}`);
      return res.status(404).json({
        success: false,
        message: 'Dive log not found',
        error: 'LOG_NOT_FOUND'
      });
    }

  } catch (error) {
    console.error('❌ DELETE DIVE LOG API: Unexpected error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
