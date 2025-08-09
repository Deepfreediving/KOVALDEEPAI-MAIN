// Production-safe user ID utilities for Koval Deep AI
// No guest/legacy logic, only supports authenticated/persistent users

/**
 * Returns a valid user ID. If input is missing/invalid, tries persistent storage, else throws.
 */
export function getOrCreateUserId(userId?: string): string {
  if (userId && typeof userId === 'string' && userId !== 'undefined' && userId !== 'null' && userId.trim() !== '') {
    return userId;
  }
  if (typeof window !== 'undefined') {
    // Try persistent user ID from localStorage
    const persistentId = localStorage.getItem('koval-ai-persistent-user-id');
    if (persistentId && persistentId !== 'undefined' && persistentId !== 'null') {
      return persistentId;
    }
    // Try session user ID
    const sessionId = sessionStorage.getItem('koval-ai-user-id');
    if (sessionId && sessionId !== 'undefined' && sessionId !== 'null') {
      return sessionId;
    }
  }
  throw new Error('No valid userId found. User must be authenticated.');
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
