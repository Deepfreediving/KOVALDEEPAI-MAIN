// utils/diveLogHelpers.ts
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const LOG_DIR = path.resolve('./data/diveLogs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export function getUserLogDir(userId: string) {
  const safeUserId = path.basename(userId);
  const dir = path.join(LOG_DIR, safeUserId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export async function saveLogEntry(userId: string, logData: Record<string, any>) {
  const id = uuidv4();
  const userDir = getUserLogDir(userId);
  const filePath = path.join(userDir, `${id}.json`);

  const logEntry = {
    id,
    ...logData,
    userId,
    timestamp: new Date().toISOString(),
    source: 'save-dive-log.ts'
  };

  await fs.promises.writeFile(filePath, JSON.stringify(logEntry, null, 2));
  return { id, filePath, logEntry };
}
