// Production-safe user ID utilities for Koval Deep AI
// No guest/legacy logic, only supports authenticated/persistent users

/**
 * Returns a valid user ID. Creates a temporary local ID for localStorage operations 
 * if no authenticated user ID is available yet.
 */
export function getOrCreateUserId(userId?: string): string {
  // 1. Use provided authenticated user ID if valid
  if (userId && typeof userId === 'string' && userId !== 'undefined' && userId !== 'null' && userId.trim() !== '') {
    // Store authenticated user ID for future use
    if (typeof window !== 'undefined') {
      localStorage.setItem('koval-ai-persistent-user-id', userId);
      sessionStorage.setItem('koval-ai-user-id', userId);
    }
    return userId;
  }
  
  if (typeof window !== 'undefined') {
    // 2. Try persistent authenticated user ID from localStorage
    const persistentId = localStorage.getItem('koval-ai-persistent-user-id');
    if (persistentId && persistentId !== 'undefined' && persistentId !== 'null' && !persistentId.startsWith('temp-')) {
      return persistentId;
    }
    
    // 3. Try session user ID
    const sessionId = sessionStorage.getItem('koval-ai-user-id');
    if (sessionId && sessionId !== 'undefined' && sessionId !== 'null' && !sessionId.startsWith('temp-')) {
      return sessionId;
    }
    
    // 4. Check URL for user ID
    const urlUserId = extractUserIdFromUrl();
    if (urlUserId && !urlUserId.startsWith('temp-')) {
      localStorage.setItem('koval-ai-persistent-user-id', urlUserId);
      sessionStorage.setItem('koval-ai-user-id', urlUserId);
      return urlUserId;
    }
    
    // 5. Create a temporary local user ID for localStorage operations
    // This ensures dive journals can always be saved locally until authentication
    let tempUserId = localStorage.getItem('koval-ai-temp-user-id');
    if (!tempUserId) {
      tempUserId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('koval-ai-temp-user-id', tempUserId);
      console.log('📝 Created temporary user ID for local storage:', tempUserId);
    }
    
    // Use temp ID for session operations too
    sessionStorage.setItem('koval-ai-user-id', tempUserId);
    return tempUserId;
  }
  
  // 6. Fallback for server-side rendering
  return `temp-ssr-${Date.now()}`;
}

/**
 * Logs the current user ID situation for debugging (no-op in production).
 */
export function debugUserIdSituation(): void {
  if (typeof window === 'undefined') return;
  // Only log in dev
  if (process.env.NODE_ENV !== 'production') {
    console.log('[UserIdUtils] persistent:', localStorage.getItem('koval-ai-persistent-user-id'));
    console.log('[UserIdUtils] session:', sessionStorage.getItem('koval-ai-user-id'));
    console.log('[UserIdUtils] all localStorage:', { ...localStorage });
  }
}

/**
 * Migrates temporary user data to authenticated user ID when authentication occurs.
 * This moves dive journals and memories from temp-* storage to authenticated user storage.
 */
export function upgradeTemporaryUserToAuthenticated(authenticatedUserId: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const tempUserId = localStorage.getItem('koval-ai-temp-user-id');
  if (!tempUserId || !tempUserId.startsWith('temp-')) {
    return false; // No temporary data to migrate
  }
  
  console.log('🔄 Upgrading temporary user data to authenticated user:', {
    from: tempUserId,
    to: authenticatedUserId
  });
  
  try {
    // Migrate dive logs
    const tempDiveLogs = localStorage.getItem(`diveLogs_${tempUserId}`);
    if (tempDiveLogs) {
      const existingLogs = localStorage.getItem(`diveLogs_${authenticatedUserId}`);
      if (existingLogs) {
        // Merge with existing logs
        const tempLogsArray = JSON.parse(tempDiveLogs);
        const existingLogsArray = JSON.parse(existingLogs);
        const mergedLogs = [...existingLogsArray, ...tempLogsArray];
        localStorage.setItem(`diveLogs_${authenticatedUserId}`, JSON.stringify(mergedLogs));
      } else {
        // Move temp logs to authenticated user
        localStorage.setItem(`diveLogs_${authenticatedUserId}`, tempDiveLogs);
      }
      localStorage.removeItem(`diveLogs_${tempUserId}`);
      console.log('✅ Migrated dive logs from temporary to authenticated user');
    }
    
    // Migrate memories
    const tempMemories = localStorage.getItem(`memories_${tempUserId}`);
    if (tempMemories) {
      const existingMemories = localStorage.getItem(`memories_${authenticatedUserId}`);
      if (existingMemories) {
        // Merge with existing memories
        const tempMemoriesArray = JSON.parse(tempMemories);
        const existingMemoriesArray = JSON.parse(existingMemories);
        const mergedMemories = [...existingMemoriesArray, ...tempMemoriesArray];
        localStorage.setItem(`memories_${authenticatedUserId}`, JSON.stringify(mergedMemories));
      } else {
        // Move temp memories to authenticated user
        localStorage.setItem(`memories_${authenticatedUserId}`, tempMemories);
      }
      localStorage.removeItem(`memories_${tempUserId}`);
      console.log('✅ Migrated memories from temporary to authenticated user');
    }
    
    // Update user ID storage
    localStorage.setItem('koval-ai-persistent-user-id', authenticatedUserId);
    sessionStorage.setItem('koval-ai-user-id', authenticatedUserId);
    localStorage.removeItem('koval-ai-temp-user-id');
    
    console.log('✅ Successfully upgraded temporary user to authenticated user');
    return true;
    
  } catch (error) {
    console.error('❌ Failed to upgrade temporary user data:', error);
    return false;
  }
}

/**
 * Migrates guest/session data to persistent user ID if needed (no-op in production).
 * Returns true if migration occurred, false otherwise.
 */
export function migrateGuestDataToPersistent(): boolean {
  if (typeof window === 'undefined') return false;
  // In production, do nothing (guests not supported)
  return false;
}

/**
 * Extracts a userId from the current URL (if present as ?userId=...)
 */
export function extractUserIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const userId = url.searchParams.get('userId');
  if (userId && userId !== 'undefined' && userId !== 'null' && userId.trim() !== '') {
    return userId;
  }
  return null;
}
