// utils/diveLogHelpers.ts
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Use /tmp directory for serverless environments (Vercel)
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const LOG_DIR = isServerless ? '/tmp/diveLogs' : path.resolve('./data/diveLogs');

// Ensure log directory exists with better error handling
export function ensureLogDir() {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
    return true;
  } catch (error) {
    console.warn('⚠️ Could not create log directory, will use memory storage:', error);
    return false;
  }
}

export function getUserLogDir(userId: string) {
  const safeUserId = path.basename(userId);
  const dir = path.join(LOG_DIR, safeUserId);
  
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  } catch (error) {
    console.warn('⚠️ Could not create user log directory:', error);
    // Return tmp directory as fallback
    return '/tmp';
  }
}

export async function saveLogEntry(userId: string, logData: Record<string, any>) {
  const id = uuidv4();
  const timestamp = new Date().toISOString();
  
  const logEntry = {
    id,
    ...logData,
    userId,
    timestamp,
    source: 'save-dive-log.ts'
  };

  // ✅ PRIMARY: Save to Wix DiveLogs collection
  try {
    const baseUrl = process.env.BASE_URL || 'https://kovaldeepai-main.vercel.app';
    
    // Prepare data for DiveLogs collection with correct field mapping
    const wixLogData = {
      userId: userId,
      diveLogId: id,
      logEntry: JSON.stringify(logEntry), // Store as JSON string in logEntry field
      diveDate: logData.date || timestamp.split('T')[0],
      diveTime: timestamp,
      diveLogWatch: logData.discipline || 'freediving'
    };

    const response = await fetch(`${baseUrl}/api/wix/query-wix-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'insert',
        collection: 'DiveLogs',
        data: wixLogData
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Dive log saved to DiveLogs collection:', result.data?._id);
      
      // Also try to save to local file as backup
      try {
        ensureLogDir();
        const userDir = getUserLogDir(userId);
        const filePath = path.join(userDir, `${id}.json`);
        await fs.promises.writeFile(filePath, JSON.stringify(logEntry, null, 2));
        console.log('✅ Backup saved to file:', filePath);
      } catch (fileError) {
        console.warn('⚠️ Backup file save failed:', fileError);
      }

      return { 
        id, 
        wixId: result.data?._id, 
        filePath: null, 
        logEntry, 
        savedToWix: true 
      };
    } else {
      throw new Error(`Wix save failed: ${response.status}`);
    }
  } catch (error) {
    console.warn('⚠️ Wix save failed, trying local file save:', error);
    
    // Fallback to local file save
    try {
      ensureLogDir();
      const userDir = getUserLogDir(userId);
      const filePath = path.join(userDir, `${id}.json`);
      
      await fs.promises.writeFile(filePath, JSON.stringify(logEntry, null, 2));
      console.log('✅ Dive log saved to file (fallback):', filePath);
      return { id, filePath, logEntry, savedToWix: false };
    } catch (fileError) {
      console.error('❌ Both Wix and file save failed:', fileError);
      // Return the log entry even if all saves fail
      return { id, filePath: null, logEntry, savedToWix: false };
    }
  }
}
