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
  
  const logEntry = {
    id,
    ...logData,
    userId,
    timestamp: new Date().toISOString(),
    source: 'save-dive-log.ts'
  };

  // Try to save to file system first
  try {
    ensureLogDir();
    const userDir = getUserLogDir(userId);
    const filePath = path.join(userDir, `${id}.json`);
    
    await fs.promises.writeFile(filePath, JSON.stringify(logEntry, null, 2));
    console.log('✅ Dive log saved to file:', filePath);
    return { id, filePath, logEntry };
  } catch (error) {
    console.warn('⚠️ File save failed, returning memory entry:', error);
    // Return the log entry even if file save fails
    return { id, filePath: null, logEntry };
  }
}
