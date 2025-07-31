import fs from "fs/promises";
import path from "path";

const MEMORY_DIR = path.resolve("./data/memoryLogs");

// Ensure memory directory exists on startup
(async () => {
  try {
    await fs.mkdir(MEMORY_DIR, { recursive: true });
  } catch (err) {
    console.warn("⚠️ Failed to create memory directory:", err);
  }
})();

export interface DiveLogEntry {
  id?: string;
  timestamp?: string;
  date?: string;
  discipline?: string;
  [key: string]: any;
}

/**
 * ✅ Get file path for a user's memory logs
 */
export const getUserMemoryFilePath = (userId: string): string => {
  return path.join(MEMORY_DIR, `${userId}.json`);
};

/**
 * ✅ Read a user's memory logs from disk
 */
export async function readUserMemory(userId: string): Promise<DiveLogEntry[]> {
  const filePath = getUserMemoryFilePath(userId);

  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data) || [];
  } catch {
    return [];
  }
}

/**
 * ✅ Write a user's memory logs to disk
 */
export async function writeUserMemory(userId: string, memory: DiveLogEntry[]): Promise<void> {
  const filePath = getUserMemoryFilePath(userId);
  await fs.writeFile(filePath, JSON.stringify(memory, null, 2), "utf8");
}

/**
 * ✅ Append a new log entry, avoiding duplicates
 */
export async function addMemoryLog(userId: string, log: DiveLogEntry): Promise<DiveLogEntry[]> {
  const existingLogs = await readUserMemory(userId);

  // Generate unique ID
  const entryId = log.id || `${log.date || Date.now()}-${Math.random()}`;
  log.id = entryId;
  log.timestamp = log.timestamp || new Date().toISOString();

  // Deduplicate based on same date+discipline
  const isDuplicate = existingLogs.some(
    (entry) => entry.date === log.date && entry.discipline === log.discipline
  );

  if (!isDuplicate) {
    existingLogs.push(log);
    await writeUserMemory(userId, existingLogs);
  }

  return existingLogs;
}
